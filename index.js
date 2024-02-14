const functions = require("firebase-functions");
const admin = require("firebase-admin");
const mysql = require("mysql");

require("dotenv").config();

// Initialize Firebase admin SDK.
// Omit deatiled settings, becasue of same GCP project.
admin.initializeApp();

// Initalize MySQL settings.
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// Trigger this function when new document adds in Firestore's collection.
exports.syncFirestoreToMySQL = functions
  .region(process.env.GCP_REGION)
  .firestore.document(`${process.env.FIRESTORE_COLLECTION}/{docId}`)
  .onCreate((snap, context) => {
    const newData = snap.data();

    // Logging.
    console.log(`New Firestore document(${context.params.docId}): `, newData);

    // Generate SQL query.
    const sql = `
        INSERT INTO vr_resource (id, title, type, filePath, groupId)
        VALUES (?, ?, ?, ?, ?)
      `;

    const values = [
      context.params.docId,
      newData.title,
      newData.type,
      newData.filePath,
      newData.groupId,
    ];

    // Insert data to MySQL.
    return new Promise((resolve, reject) => {
      pool.query(sql, values, (error, results, fields) => {
        if (error) {
          console.error(error);
          reject(error);
        } else {
          console.log("Inserted data into MySQL", results);
          resolve(results);
        }
      });
    });
  });
