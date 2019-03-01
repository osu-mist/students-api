const appRoot = require('app-root-path');

const studentsDAO = require('../../../db/oracledb/students-dao');

const { errorBuilder, errorHandler } = appRoot.require('errors/errors');
const { openapi: { paths } } = appRoot.require('utils/load-openapi');

const get = async (req, res) => {
  try {
    const { osuID } = req.params;
    const { term } = req.query;
    const result = await studentsDAO.getGradesById(osuID, term);
    if (result === undefined) {
      errorBuilder(res, 404, 'A student with the OSU ID was not found.');
    } else {
      res.send(result);
    }
  } catch (err) {
    errorHandler(res, err);
  }
};

get.apiDoc = paths['/students/{osuID}/grades'].get;

module.exports = { get };
