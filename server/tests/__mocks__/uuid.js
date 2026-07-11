const crypto = require('crypto');

exports.v4 = () => crypto.randomUUID();
