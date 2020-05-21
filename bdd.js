let mysql = require("mysql");
let util = require('util');

let conn = mysql.createConnection({
    database: "copbot",
    host: "164.132.46.160",
    user: "copbotindex",
    password: "On3mdvMVbRA25Tmz"
  });

const query = util.promisify(conn.query).bind(conn);
exports.conn = conn;
exports.query = query;