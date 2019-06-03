const appRoot = require('app-root-path');

const studentsDao = require('../../../db/oracledb/students-dao');

const { errorHandler } = appRoot.require('errors/errors');
const { openapi: { paths } } = appRoot.require('utils/load-openapi');

const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const { term } = req.query;
    const result = await studentsDao.getDegreesById(osuId, term);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

get.apiDoc = paths['/students/{osuId}/degrees'].get;

module.exports = { get };
