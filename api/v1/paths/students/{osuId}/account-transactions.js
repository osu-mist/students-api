const appRoot = require('app-root-path');

const studentsDao = require('../../../db/oracledb/students-dao');

const { errorHandler } = appRoot.require('errors/errors');

/**
 * Get account transactions
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await studentsDao.getAccountTransactionsById(osuId);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

module.exports = { get };
