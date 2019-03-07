const { expect } = require('chai');
const oracledb = require('oracledb');
const sinon = require('sinon');

const mockConfig = {};

sinon.stub(oracledb, 'getConnection').resolves({
  execute: (sql) => {
    if (sql === 'select 1 from dual') {
      return '1000000';
    }
    return 2;
  },
  close: () => {},
});

describe('Parent', () => {
  it('should work', async () => {
    let conn;

    try {
      conn = await oracledb.getConnection(mockConfig);

      // sinon.stub(conn, 'execute').resolves({
      //   rows: [[2]]
      // });

      const result = await conn.execute('select 1 from dual');
      console.log(result);
      expect(result.rows[0][0]).to.equal(1);
    } catch (err) {
      console.error(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          console.error(err);
        }
      }
    }
  });
});
