const mysql = require("./bdd");
const Copbot = require("./func");

(async () => {
    try {
      const copbot = await Copbot();
  
      let args = process.argv.slice(2)[0];
      let args2 = process.argv.slice(2)[1];

      if (args == "update") {
        
      } else if (args == "times") {
        await copbot.times();
      } else if (args == "findDrop") {
        await copbot.findDroplistPage(args2);
        await copbot.downloadImg();
        
      }else{
        console.log('----------');
        console.log('Commandes :');
        console.log('----------');
        console.log('1. times - declenchement avant les drop pour calculer les temps');
        console.log('2. findDrop - trouver le dernier drop et inser toute les infos');
      }

    } catch (error) {
      console.log(error);
    } finally {
      process.exit(0);
    }
  })();