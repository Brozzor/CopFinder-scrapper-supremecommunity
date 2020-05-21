const mysql = require("./bdd");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

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
    scMainPage = scMainPage(".col-sm-4.col-xs-12.app-lr-pad-2").find("a")[0].attribs.href;

    //scMainPage = "/season/spring-summer2020/droplist/2020-05-07/";

    const resLastDrop = await fetch(`https://www.supremecommunity.com${scMainPage}`);
    let scLastDropPage = cheerio.load(await resLastDrop.text());

    let lenItem = scLastDropPage(".masonry__item").find("img").length;
    let i = 0;
    let allItems = new Object();
    let infosWeek = new Object();
    infosWeek.week = await searchWeek(scLastDropPage("title").text().trim());
    infosWeek.moreInfos = await scLastDropPage(".sc-moreinfos").text().trim();
    infosWeek.season = await searchSeason(scMainPage);

    while (i < lenItem) {
      let itemId = scLastDropPage(".masonry__item").find(".card-details")[i].attribs["data-itemid"];
      const resItem = await fetch(`https://www.supremecommunity.com/season/itemdetails/${itemId}/`);
      let scItemPage = cheerio.load(await resItem.text());

      let j = 0;
      lenImg = scItemPage("img").length;
      allItems[itemId] = new Object();
      allItems[itemId].name = scItemPage("h1").text();
      allItems[itemId].desc = scItemPage("h2.detail-desc").text();
      allItems[itemId].price = scItemPage("body > div > div:nth-child(3) > div > div:nth-child(5) > div > ul > li:nth-child(2) > div.tab__content > div")
        .text()
        .trim()
        .replace(/[\s]{2,}/g, " ");

      allItems[itemId].img = JSON.parse(JSON.stringify(scItemPage("img")[0].attribs));

      await sleep(500);
      i++;
    }
    await storage(allItems, infosWeek);
  }

  async function searchWeek(str) {
    let i = 0;
    let nbFind = 0;
    let newStr = "";
    while (i < str.length) {
      if (str[i] == "-") {
        nbFind++;
      } else if (nbFind == 1) {
        newStr += str[i];
      }

      i++;
    }

    return newStr.trim().replace(new RegExp("[^(0-9)]", "g"), "");
  }

  async function searchSeason(str) {
    let season = str.split("/")[2];
    let seasonClean = season.replace(new RegExp("[^(a-zA-Z)]", "g"), "");
    let seasonCleanYear = season.replace(new RegExp("[^(0-9)]", "g"), "").substr(2);
    if (seasonClean == "springsummer") {
      return `SS${seasonCleanYear}`;
    } else {
      return `FW${seasonCleanYear}`;
    }
  }

  async function isExist(season, week) {
    let res = true;
    const nb = await mysql.query(`SELECT count(*) as nb FROM drop_season WHERE season = '${season}' AND week = '${week}' `);
    if (nb[0].nb != "0") {
      res = true;
    } else {
      res = false;
    }
    return res;
  }

  async function insertNewSeason(infosWeek) {
    let sqlRequest = `INSERT INTO drop_season(season,week,date_drop,more_infos) VALUES('${addslashes(infosWeek.season)}','${addslashes(infosWeek.week)}','2020-09-11','${addslashes(
      infosWeek.moreInfos
    )}')`;
    await mysql.query(sqlRequest);
  }

  async function storage(allItems, infosWeek) {
    console.log(allItems);
    console.log(infosWeek);
    if (!(await isExist(infosWeek.season, infosWeek.week))) {
      await insertNewSeason(infosWeek);
    }
    await checkUpdateContent(allItems, infosWeek);
  }

  async function checkUpdateContent(allItems, infosWeek) {
    const items = await mysql.query(`SELECT * FROM drop_items WHERE idseason = 3`);
    for (const i in items) { 
      if (await checkExistAndChange(items[i], allItems)){

      }
    }
  }

  async function checkExistAndChange(items, allItems) {
    let i = 0;
    console.log(allItems.length) 
    console.log(allItems[0]) 
    while (i < allItems.length){
      console.log(allItems[i]) 
      i++;
    }
  }

  function addslashes(ch) {
    ch = ch.replace(/\\/g, "\\\\");
    ch = ch.replace(/\'/g, "\\'");
    ch = ch.replace(/\"/g, '\\"');
    return ch;
  }

  return {
    sleep,
    findDroplistPage,
    times,
  };
};
