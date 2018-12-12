const appRoot = require('app-root-path');
const _ = require('lodash');

const contrib = appRoot.require('api/v1/db/oracledb/contrib/contrib');
const { getConnection } = appRoot.require('api/v1/db/oracledb/connection');
const { SerializedGPAs, SerializedAccountBalance, SerializedTransactions } = require('../../serializers/students-serializer');

/**
 * @summary Return a specific pet by unique ID
 * @function
 * @param {string} osuID OSU ID
 * @returns {Promise} Promise object represents a specific pet
 */
const getGPAsById = osuID => new Promise(async (resolve, reject) => {
  const connection = await getConnection();
  try {
    const { rows } = await connection.execute(contrib.getGPALevelsByID(), [osuID]);
    if (_.isEmpty(rows)) {
      resolve(undefined);
    } else {
      const serializedGPAs = SerializedGPAs(rows, osuID);
      resolve(serializedGPAs);
    }
  } catch (err) {
    reject(err);
  } finally {
    connection.close();
  }
});

/**
 * @summary Return a specific pet by unique ID
 * @function
 * @param {string} osuID OSU ID
 * @returns {Promise} Promise object represents a specific pet
 */
const getAccountBalanceById = osuID => new Promise(async (resolve, reject) => {
  const connection = await getConnection();
  try {
    const { rows } = await connection.execute(contrib.getAccountBalanceByID(), [osuID]);
    const [row] = rows;
    if (_.isEmpty(row)) {
      resolve(undefined);
    } else {
      const serializedAccountBalance = SerializedAccountBalance(row, osuID);
      resolve(serializedAccountBalance);
    }
  } catch (err) {
    reject(err);
  } finally {
    connection.close();
  }
});

/**
 * @summary Return a specific pet by unique ID
 * @function
 * @param {string} osuID OSU ID
 * @returns {Promise} Promise object represents a specific pet
 */
const getTransactionsById = osuID => new Promise(async (resolve, reject) => {
  const connection = await getConnection();
  try {
    const { rows } = await connection.execute(contrib.getAccountTransactionsByID(), [osuID]);
    if (_.isEmpty(rows)) {
      resolve(undefined);
    } else {
      const serializedTransactions = SerializedTransactions(rows, osuID);
      resolve(serializedTransactions);
    }
  } catch (err) {
    reject(err);
  } finally {
    connection.close();
  }
});

module.exports = { getGPAsById, getAccountBalanceById, getTransactionsById };
