
const BaseJoi = require('joi');
const { parsePhoneNumberFromString } = require('libphonenumber-js/max');

const Joi = BaseJoi.extend((joi) => ({
	type: 'string',
	base: joi.string(),
	messages: {
		'string.phone': '{{#label}} must be a valid phone number',
	},
	rules: {
		phone: {
			method(options = {}) {
				return this.$_addRule({ name: 'phone', args: { options } });
			},
			args: [{
				name: 'options',
				assert: (v) => {
					if (typeof v !== 'object' || v === null) return false;
					const { defaultCountry, allowedCountries } = v;
					if (defaultCountry !== undefined && !/^[A-Z]{2}$/.test(defaultCountry)) return false;
					if (allowedCountries !== undefined &&
						!(Array.isArray(allowedCountries) && allowedCountries.every((c) => /^[A-Z]{2}$/.test(c)))) return false;
					return true;
				},
				message: 'must be { defaultCountry?: "XX", allowedCountries?: ["XX", ...] }',
			}],
			validate(value, helpers, { options }) {
				const { defaultCountry, allowedCountries } = options;
				const phone = parsePhoneNumberFromString(String(value).trim(), defaultCountry);
				if (!phone || !phone.isValid())
					return helpers.error('string.phone');

				if (allowedCountries) {
					const set = new Set(options.allowedCountries);
					if (defaultCountry)
						set.add(defaultCountry);
					if (!set.has(phone.country))
						return helpers.error('string.phone');
				}

				return phone.number;
			},
		}
	},
}));

/**
 * 
 * @param {import('joi').Schema |object} schema 
 * @returns {import('joi').Schema}
 */
function toSchema(schema) {
	return Joi.isSchema(schema) ? schema : Joi.object(schema);
}

/**
 * @param {*} data
 * @param {import('joi').Schema|object} schema
 * @returns {string|null}
 */
Joi.getError = function (data, schema) {
	const { error } = toSchema(schema).validate(data);
	return error ? error.details[0].message : null;
};

/**
 * Like getError, but also returns the validated (and converted) value,
 * @returns {{ error: string|null, value: * }}
 */
Joi.check = function (data, schema) {
	const { error, value } = toSchema(schema).validate(data);
	return { error: error ? error.details[0].message : null, value };
};

module.exports = Joi;