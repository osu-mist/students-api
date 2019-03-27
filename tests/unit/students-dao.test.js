const appRoot = require('app-root-path');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const config = require('config');
const _ = require('lodash');
const sinon = require('sinon');

sinon.replace(config, 'get', () => ({ oracledb: {} }));
const conn = appRoot.require('api/v1/db/oracledb/connection');
const studentsDao = appRoot.require('api/v1/db/oracledb/students-dao');

chai.should();
chai.use(chaiAsPromised);
const { any } = sinon.match;

describe('Test students-dao', () => {
  const fakeId = 'fakeId';
  const fakeParams = {};
  const stubStudentsSerializer = sinon.stub().returnsArg(0);

  sinon.stub(conn, 'getConnection').resolves({
    execute: (sql) => {
      const sqlResults = {
        multiResults: { rows: [{}, {}] },
        singleResult: { rows: [{}] },
      };
      return sql in sqlResults ? sqlResults[sql] : sqlResults.singleResult;
    },
    close: () => null,
  });

  it(`should be fulfilled if
        1. isSingleton is true and only get exact one result
        2. isSingleton is false and get a list of results`, () => {
    const fulfilledCases = [
      { fakeSql: () => 'singleResult', isSingleton: true, expectResult: {} },
      { fakeSql: () => 'singleResult', isSingleton: false, expectResult: [{}] },
      { fakeSql: () => 'multiResults', isSingleton: false, expectResult: [{}, {}] },
    ];

    const fulfilledPromises = [];
    _.each(fulfilledCases, ({ fakeSql, isSingleton, expectResult }) => {
      const result = studentsDao.getResourceById(
        fakeId, fakeSql, stubStudentsSerializer, isSingleton, fakeParams,
      );
      fulfilledPromises.push(result.should
        .eventually.be.fulfilled
        .and.deep.equal(expectResult)
        .then(() => {
          sinon.assert.alwaysCalledWithExactly(stubStudentsSerializer, any, any, fakeParams);
          sinon.assert.callCount(stubStudentsSerializer, fulfilledCases.length);
        }));
    });
    return Promise.all(fulfilledPromises);
  });
  it('should be rejected if isSingleton is true but get multiple results', () => {
    const fakeSql = () => 'multiResults';
    const isSingleton = true;
    const expectResult = 'Expect a single object but got multiple results.';

    const result = studentsDao.getResourceById(
      fakeId, fakeSql, stubStudentsSerializer, isSingleton, fakeParams,
    );
    return result.should
      .eventually.be.rejectedWith(expectResult)
      .and.be.an.instanceOf(Error)
      .then(() => sinon.assert.notCalled(stubStudentsSerializer));
  });
  afterEach(() => stubStudentsSerializer.resetHistory());
});
