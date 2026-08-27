const app = require('../../server');

module.exports = (req, res) => {
  req.url = `/api/rakhi/${req.query.id}`;
  app(req, res);
};