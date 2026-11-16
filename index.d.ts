import Joi = require('joi');

declare module 'joi' {
	interface PhoneOptions {
		/** Country that numbers without a country code are read as, e.g. 'ZW'. Not a restriction. */
		defaultCountry?: string;
		/** Only accept numbers from these countries. Omit to accept any. */
		allowedCountries?: string[];
	}

	interface StringSchema<TSchema = string> {
		/** Validates a phone number and converts it to E.164. */
		phone(options?: PhoneOptions): this;
	}

	interface Root {
		/** Returns the first validation error message, or null if valid. */
		getError(data: any, schema: Schema | SchemaMap): string | null;

		/** Like getError, but also returns the validated (and converted) value. */
		check<T = any>(data: any, schema: Schema | SchemaMap): { error: string | null; value: T };
	}
}

export = Joi;