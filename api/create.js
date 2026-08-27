const app = require('../server');

module.exports = (req, res) => {
  req.url = '/api/create';
  app(req, res);
};