const appRoot = require('app-root-path');
const config = require('config');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

sinon.replace(config, 'get', () => ({ oracledb: {} }));
const conn = appRoot.require('api/v1/db/oracledb/connection');
const studentsDao = appRoot.require('api/v1/db/oracledb/students-dao');

chai.use(chaiAsPromised);
const { expect } = chai;

sinon.stub(conn, 'getConnection').resolves({
  execute: (sql) => {
    const sqlResults = {
      multiResults: { rows: [{}, {}] },
      singleResult: { rows: [{}] },
    };
    return sqlResults[sql];
  },
  close: () => {},
});

describe('Test students-dao', () => {
  describe('Test getResourceById', () => {
    it('should reject promise if isSingleton is true but get multiple results', () => {
      const fakeId = 'fakeId';
      const fakeSql = () => 'multiResults';
      const isSingleton = true;
      const fakeStudentsSerializer = rows => rows;
      const fakeParams = {};

      const result = studentsDao.getResourceById(
        fakeId,
        fakeSql,
        fakeStudentsSerializer,
        isSingleton,
        fakeParams,
      );
      return expect(result).to.eventually
        .be.rejectedWith('Expect a single object but got multiple results.')
        .and.be.an.instanceOf(Error);
    });
  });
});
