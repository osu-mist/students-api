const appRoot = require('app-root-path');
const config = require('config');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const _ = require('lodash');
const sinon = require('sinon');

sinon.replace(config, 'get', () => ({ oracledb: {} }));
const conn = appRoot.require('api/v1/db/oracledb/connection');
const studentsDao = appRoot.require('api/v1/db/oracledb/students-dao');

chai.should();
chai.use(chaiAsPromised);
const { any } = sinon.match;

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

describe('Test students-dao', () => {
  const fakeId = 'fakeId';
  const fakeStudentsSerializer = (rows, id, params) => rows; // eslint-disable-line no-unused-vars

  describe('Test getResourceById()', () => {
    const fakeParams = {};

    it(`should be fulfilled if
          1. isSingleton is true and only get exact one result
          2. isSingleton is false and get a list of results`, () => {
      const spy = sinon.spy(fakeStudentsSerializer);
      const fulfilledCases = [
        { fakeSql: () => 'singleResult', isSingleton: true, expectResult: {} },
        { fakeSql: () => 'singleResult', isSingleton: false, expectResult: [{}] },
        { fakeSql: () => 'multiResults', isSingleton: false, expectResult: [{}, {}] },
      ];

      const fulfilledPromises = [];
      _.each(fulfilledCases, ({ fakeSql, isSingleton, expectResult }) => {
        const result = studentsDao.getResourceById(fakeId, fakeSql, spy, isSingleton, fakeParams);
        fulfilledPromises.push(result.should
          .to.eventually.be.fulfilled
          .and.deep.equal(expectResult)
          .then(() => {
            sinon.assert.alwaysCalledWithExactly(spy, any, any, fakeParams);
            sinon.assert.calledThrice(spy);
          }));
      });
      return Promise.all(fulfilledPromises);
    });
    it('should be rejected if isSingleton is true but get multiple results', () => {
      const fakeSql = () => 'multiResults';
      const spy = sinon.spy(fakeStudentsSerializer);
      const isSingleton = true;
      const expectResult = 'Expect a single object but got multiple results.';

      const result = studentsDao.getResourceById(fakeId, fakeSql, spy, isSingleton, fakeParams);
      return result.should
        .to.eventually.be.rejectedWith(expectResult)
        .and.be.an.instanceOf(Error)
        .then(() => sinon.assert.notCalled(spy));
    });
  });
  describe('Test all getResourceById methods', () => {
    it('test getGpaById()', () => {
      const result = studentsDao.getGpaById(fakeId);
      const expectResult = {
        links: { self: '/v1/students/fakeId/gpa' },
        data: {
          id: fakeId,
          type: 'gpa',
          attributes: {
            gpaLevels: [
              {
                creditHoursAttempted: NaN,
                creditHoursEarned: NaN,
                creditHoursPassed: NaN,
                gpaCreditHours: NaN,
              },
            ],
          },
          links: { self: null },
        },
      };

      return result.should
        .to.eventually.be.fulfilled
        .and.to.deep.include(expectResult);
    });
  });
});
