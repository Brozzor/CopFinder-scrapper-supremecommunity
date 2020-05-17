const mysql = require("./bdd");
const fetch = require("node-fetch");
const cheerio = require('cheerio');

module.exports = async (browser) => {
  const sleep = (ms, dev = 1) => {
    const msWithDev = (Math.random() * dev + 1) * ms;
    console.log("Sleeping", msWithDev / 1000, "sec");
    return new Promise((resolve) => setTimeout(resolve, msWithDev));
  };

  async function times() {
    const response = await fetch("https://www.supremenewyork.com/mobile_stock.json");
    let json = await response.json();
    json = json.products_and_categories.new;
    let i = 0;
    while (i < json.length) {
      const resItems = await fetch(`https://www.supremenewyork.com/shop/${json[i].id}.json`);
      let jsonItems = await resItems.json();
      console.log("--------");
      console.log(json[i]);
      console.log(jsonItems);
      console.log("--------");
      i++;
    }

  }

  async function findDroplistPage() {

    // recherche de la derniere page de droplist
    let response = await fetch("https://www.supremecommunity.com/season/latest/droplists/");
    let scMainPage = cheerio.load(await response.text());
    scMainPage = scMainPage('.col-sm-4.col-xs-12.app-lr-pad-2').find('a')[0].attribs.href;

    scMainPage = "/season/spring-summer2020/droplist/2020-05-14/";
    // on verra pllus tard
    const resLastDrop = await fetch(`https://www.supremecommunity.com${scMainPage}`);
    let scLastDropPage = cheerio.load(await resLastDrop.text());

    let lenItem = scLastDropPage('.masonry__item').find('img').length;
    let i = 0;
    let allItems = new Object();
    
    while (i < lenItem) {
        let itemId = scLastDropPage('.masonry__item').find('.card-details')[i].attribs['data-itemid'];
        const resItem = await fetch(`https://www.supremecommunity.com/season/itemdetails/${itemId}/`);
        let scItemPage = cheerio.load(await resItem.text());
        
        let j = 0;
        lenImg = scItemPage('img').length;
        allItems[itemId] = new Object();
        allItems[itemId].name = scItemPage('h1').text();
        allItems[itemId].desc = scItemPage('h2.detail-desc').text();
        allItems[itemId].price = scItemPage('body > div > div:nth-child(3) > div > div:nth-child(5) > div > ul > li:nth-child(2) > div.tab__content > div').text().trim().replace(/[\s]{2,}/g," ");
        let arrItemImg = [];
        while (j < lenImg){
            let imgUnique = scItemPage('img')[j].attribs;
            if (!imgUnique.src.includes('/s/img/deals/')){
                arrItemImg.push(JSON.parse(JSON.stringify(imgUnique)));
            }
            j++;
        }
        allItems[itemId].img = arrItemImg
        await sleep(250);
        i++;
    }
    await storage(allItems, infosWeek)
  }

  async function storage(allItems, infosWeek = null){
    console.log(allItems)
  }

  return {
    sleep,
    findDroplistPage,
    times,
  };
};
