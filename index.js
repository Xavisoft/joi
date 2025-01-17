
"use strict"

const Joi = require('joi');

/**
 * 
 * @param {*} data 
 * @param {Joi.Schema} schema 
 * @returns {string|null}
 */
Joi.getError = function (data, schema) {

	if (!Joi.isSchema(schema))
		schema = Joi.object(schema);

	const isValid = schema.validate(data);

	if (isValid.error)
		return isValid.error.details[0].message;

	return null;

}

module.exports = Joi;