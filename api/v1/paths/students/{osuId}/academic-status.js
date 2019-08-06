const appRoot = require('app-root-path');

const studentsDao = require('../../../db/oracledb/students-dao');

const { errorHandler } = appRoot.require('errors/errors');

/**
 * Get academic status
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const { term } = req.query;
    const result = await studentsDao.getAcademicStatusById(osuId, term);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

module.exports = { get };
