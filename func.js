const mysql = require("./bdd");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require("fs");
const axios = require("axios");

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

  async function findDroplistPage(url = "") {
    // recherche de la derniere page de droplist
    let response = await fetch("https://www.supremecommunity.com/season/latest/droplists/");
    let scMainPage = cheerio.load(await response.text());
    scMainPage = scMainPage(".col-sm-4.col-xs-12.app-lr-pad-2").find("a")[0].attribs.href;

    if (url.length > 4){
      scMainPage = "/" + url;
    }
    const resLastDrop = await fetch(`https://www.supremecommunity.com${scMainPage}`);
    let scLastDropPage = cheerio.load(await resLastDrop.text());

    let lenItem = scLastDropPage(".masonry__item").find("img").length;
    let i = 0;
    let allItems = new Object();
    let infosWeek = new Object();
    infosWeek.week = await searchWeek(scLastDropPage("title").text().trim());
    infosWeek.date = await searchDate(scMainPage);
    infosWeek.moreInfos = await scLastDropPage(".sc-moreinfos").text().trim();
    infosWeek.season = await searchSeason(scMainPage);

    while (i < lenItem) {
      let itemId = scLastDropPage(".masonry__item").find(".card-details")[i].attribs["data-itemid"];
      const resItem = await fetch(`https://www.supremecommunity.com/season/itemdetails/${itemId}/`);
      let scItemPage = cheerio.load(await resItem.text());

      lenImg = scItemPage("img").length;
      allItems[i] = new Object();
      allItems[i].id = itemId;
      allItems[i].name = scItemPage("h1").text();
      allItems[i].desc = scItemPage("h2.detail-desc").text();
      allItems[i].price = scItemPage("body > div > div:nth-child(3) > div > div:nth-child(5) > div > ul > li:nth-child(2) > div.tab__content > div")
        .text()
        .trim()
        .replace(/[\s]{2,}/g, " ");

      allItems[i].img = scItemPage("img")[0].attribs.src;

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

  async function searchDate(str) {
    return str.split("/")[4];
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
    let sqlRequest = `INSERT INTO drop_season(season,week,date_drop,more_infos) VALUES('${addslashes(infosWeek.season)}','${addslashes(infosWeek.week)}','${addslashes(infosWeek.date)}','${addslashes(
      infosWeek.moreInfos
    )}')`;
    await mysql.query(sqlRequest);
  }

  async function storage(allItems, infosWeek) {
    if (!(await isExist(infosWeek.season, infosWeek.week))) {
      await insertNewSeason(infosWeek);
    }
    await checkUpdateContent(allItems, infosWeek);
    await addNewItemsInDb(allItems, infosWeek);
  }

  async function addNewItemsInDb(allItems, infosWeek) {
    const idseason = await mysql.query(`SELECT id FROM drop_season WHERE season = '${addslashes(infosWeek.season)}' AND week = '${infosWeek.week}'`);
    const items = await mysql.query(`SELECT * FROM drop_items WHERE idseason = ${idseason[0].id}`);
    let i = 0;

    while (i < (await itemsLength(allItems))) {
      if (!(await checkExistRevert(allItems[i], items))) {
        await mysql.query(
          `INSERT INTO drop_items(idsc,idseason,name,description, price, img) VALUES('${allItems[i].id}','${idseason[0].id}','${addslashes(allItems[i].name)}','${addslashes(
            allItems[i].desc
          )}','${addslashes(allItems[i].price)}','${addslashes(allItems[i].img)}')`
        );
        const lastIdInsert = await mysql.query(`SELECT LAST_INSERT_ID() FROM drop_items`);
        if(lastIdInsert != undefined){
          await downloadImg(addslashes(allItems[i].img),lastIdInsert[0]['LAST_INSERT_ID()']);
        }
        
      }
      i++;
    }
  }

  async function checkUpdateContent(allItems, infosWeek) {
    const idseason = await mysql.query(`SELECT id FROM drop_season WHERE season = '${addslashes(infosWeek.season)}' AND week = '${infosWeek.week}'`);
    const items = await mysql.query(`SELECT * FROM drop_items WHERE idseason = ${idseason[0].id}`);
    for (const i in items) {
      if ((await checkExist(items[i], allItems)) && (await checkChange(await checkExist(items[i], allItems), items[i]))) {
        await updateChange(await checkExist(items[i], allItems));
      }
      // mettre une condition else pour supprimer ceux qui n'existent plus
    }
  }

  async function updateChange(value) {
    const items = await mysql.query(`SELECT id FROM drop_items WHERE idsc = ${value.id}`);
    await downloadImg(addslashes(value.img),items[0].id);
    await mysql.query(
      `UPDATE drop_items SET name = '${addslashes(value.name)}', description = '${addslashes(value.desc)}', price = '${addslashes(value.price)}', img = '${addslashes(value.img)}' WHERE idsc = '${
        value.id
      }'`
    );
    
  }

  async function checkChange(findItems, oldItem) {
    if (!findItems) {
      return false;
    }

    if (findItems.name != oldItem.name || findItems.price != oldItem.price || findItems.desc != oldItem.description || findItems.img != oldItem.img) {
      return true;
    }
    return false;
  }

  async function checkExist(items, allItems) {
    let i = 0;
    while (i < (await itemsLength(allItems))) {
      if (items.idsc == allItems[i].id) {
        return allItems[i];
      }
      i++;
    }
    return false;
  }

  async function checkExistRevert(items, allItems) {
    let i = 0;

    while (i < allItems.length) {
      if (parseInt(items.id) == parseInt(allItems[i].idsc)) {
        return true;
      }
      i++;
    }
    return false;
  }

  async function itemsLength(allItems) {
    let i = 0;
    while (allItems[i] != undefined) {
      i++;
    }
    return i;
  }

  async function downloadImg(url,id) {
    if (fs.existsSync(`images/${id}.jpg`)){
      fs.unlinkSync(`images/${id}.jpg`);
    }
    if (url.includes('placeholder.jpg')){
      return false;
    }
    if (id != undefined){
      await download_image(`https://www.supremecommunity.com${url}`, `images/${id}.jpg`);
    }
    
  }

  const download_image = (url, image_path) =>
    axios({
      url,
      responseType: "stream",
    }).then(
      (response) =>
        new Promise((resolve, reject) => {
          response.data
            .pipe(fs.createWriteStream(image_path))
            .on("finish", () => resolve())
            .on("error", (e) => reject(e));
        })
    );

  async function itemsLength(allItems) {
    let i = 0;
    while (allItems[i] != undefined) {
      i++;
    }
    return i;
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
    downloadImg,
  };
};
