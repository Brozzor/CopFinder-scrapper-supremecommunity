let mysql = require("mysql");
let util = require('util');

let conn = mysql.createConnection({
    database: "copbot",
    host: "164.132.46.160",
    user: "copbot",
    password: "FZJOKbh0tkfu73ZU"
  });

const query = util.promisify(conn.query).bind(conn);
exports.conn = conn;
exports.query = query;