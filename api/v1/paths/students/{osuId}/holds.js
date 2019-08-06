const appRoot = require('app-root-path');

const studentsDao = require('../../../db/oracledb/students-dao');

const { errorHandler } = appRoot.require('errors/errors');

/**
 * Get holds
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await studentsDao.getHoldsById(osuId);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

module.exports = { get };
