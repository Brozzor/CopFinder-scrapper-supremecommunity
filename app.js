const mysql = require("./bdd");
const Copbot = require("./func");

(async () => {
    try {
      const copbot = await Copbot();
  
      let args = process.argv.slice(2);
      if (args == "update") {
        
      } else if (args == "times") {
        await copbot.times();
      } else if (args == "findDrop") {
        await copbot.findDroplistPage();
      }

    } catch (error) {
      console.log(error);
    } finally {
      process.exit(0);
    }
  })();