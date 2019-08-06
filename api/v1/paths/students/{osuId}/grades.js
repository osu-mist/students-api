const appRoot = require('app-root-path');

const studentsDao = require('../../../db/oracledb/students-dao');

const { errorHandler } = appRoot.require('errors/errors');

/**
 * Get grades
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const { term } = req.query;
    const result = await studentsDao.getGradesById(osuId, term);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

module.exports = { get };
