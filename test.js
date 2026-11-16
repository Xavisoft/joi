
const Joi = require('.');
const casual = require('casual');
const { assert } = require('chai');

test('Test with a non-Joi schema', () => {
   
   const schema = {
      name: Joi.string().required(),
      surname: Joi.string().required(),
      age: Joi.number(),
   }

   const data = {
      name: casual.first_name,
      surname: casual.last_name,
   }

   let error = Joi.getError(data, schema);
   assert.isNull(error);

   data.age = casual.street;

   error = Joi.getError(data, schema);
   assert.isString(error);

})

test('Test with Joi schema', () => {
   const schema = Joi.object({
      name: Joi.string(),
      surname: Joi.string(),
      age: Joi.number(),
   }).min(1);

   const data = {
      name: casual.first_name,
      surname: casual.last_name,
   }

   let error = Joi.getError(data, schema);
   assert.isNull(error);

   error = Joi.getError({}, schema);
   assert.isString(error);
});

suite("Joi.string().phone()", () => {
   suite("options validation", () => {
      test("throws when options is not an object or is null", () => {
         assert.throws(() => Joi.string().phone("ZW"));
         assert.throws(() => Joi.string().phone(null));
         assert.throws(() => Joi.string().phone(123));
      });

      test("throws when defaultCountry is not a 2-letter uppercase ISO code", () => {
         assert.throws(() => Joi.string().phone({ defaultCountry: "zw" }));
         assert.throws(() => Joi.string().phone({ defaultCountry: "ZWE" }));
         assert.throws(() => Joi.string().phone({ defaultCountry: "12" }));
      });

      test("throws when allowedCountries is not an array of 2-letter uppercase ISO codes", () => {
         assert.throws(() => Joi.string().phone({ allowedCountries: "ZW" }));
         assert.throws(() => Joi.string().phone({ allowedCountries: ["zw"] }));
         assert.throws(() => Joi.string().phone({ allowedCountries: ["ZWE"] }));
         assert.throws(() => Joi.string().phone({ allowedCountries: ["ZW", "12"] }));
      });

      test("does not throw when options are valid or omitted", () => {
         assert.doesNotThrow(() => Joi.string().phone());
         assert.doesNotThrow(() => Joi.string().phone({}));
         assert.doesNotThrow(() => Joi.string().phone({ defaultCountry: "ZW" }));
         assert.doesNotThrow(() => Joi.string().phone({ allowedCountries: ["ZW", "ZA"] }));
         assert.doesNotThrow(() => Joi.string().phone({ defaultCountry: "ZW", allowedCountries: ["ZW", "ZA"] }));
      });
   });

   suite("default behavior (no options)", () => {
      const schema = Joi.string().phone();

      test("validates and converts international phone numbers to E.164", () => {
         const { error, value } = schema.validate("+263 77 123 4567");
         assert.isNull(error || null);
         assert.equal(value, "+263771234567");

         const resUS = schema.validate("+1 (202) 555-0123");
         assert.isNull(resUS.error || null);
         assert.equal(resUS.value, "+12025550123");
      });

      test("trims whitespace and strips formatting characters", () => {
         const { error, value } = schema.validate("  +44 20 7946 0991  ");
         assert.isNull(error || null);
         assert.equal(value, "+442079460991");
      });

      test("is idempotent when re-validating normalized numbers", () => {
         const first = schema.validate("+263 77 123 4567").value;
         const second = schema.validate(first).value;
         assert.equal(second, "+263771234567");
      });

      test("rejects local numbers without a country code", () => {
         const { error } = schema.validate("0771234567");
         assert.isNotNull(error);
         assert.equal(error.details[0].message, '"value" must be a valid phone number');
      });

      test("rejects invalid, malformed, or unparseable numbers", () => {
         assert.isNotNull(schema.validate("not-a-number").error);
         assert.isNotNull(schema.validate("12345").error);
         assert.isNotNull(schema.validate("+263000000000").error);
      });

      test("accepts valid non-geographic numbers", () => {
         const { error, value } = schema.validate("+80012345678");
         assert.isNull(error || null);
         assert.equal(value, "+80012345678");
      });

      test("uses custom error message template", () => {
         const objSchema = Joi.object({
            phone: Joi.string().phone(),
         });
         const error = Joi.getError({ phone: "invalid" }, objSchema);
         assert.equal(error, '"phone" must be a valid phone number');
      });
   });

   suite("with defaultCountry", () => {
      const schema = Joi.string().phone({ defaultCountry: "ZW" });

      test("parses local number with leading zero into E.164", () => {
         const { error, value } = schema.validate("0771234567");
         assert.isNull(error || null);
         assert.equal(value, "+263771234567");
      });

      test("parses local number without leading zero into E.164", () => {
         const { error, value } = schema.validate("771234567");
         assert.isNull(error || null);
         assert.equal(value, "+263771234567");
      });

      test("still accepts valid numbers with explicit country codes from other countries", () => {
         const { error, value } = schema.validate("+1 202 555 0123");
         assert.isNull(error || null);
         assert.equal(value, "+12025550123");
      });

      test("rejects numbers that are invalid under default country numbering plan", () => {
         const { error } = schema.validate("0999999999");
         assert.isNotNull(error);
      });
   });

   suite("with allowedCountries", () => {
      const schema = Joi.string().phone({ allowedCountries: ["ZW", "ZA"] });

      test("accepts valid international numbers from allowed countries", () => {
         const resZW = schema.validate("+263771234567");
         assert.isNull(resZW.error || null);
         assert.equal(resZW.value, "+263771234567");

         const resZA = schema.validate("+27821234567");
         assert.isNull(resZA.error || null);
         assert.equal(resZA.value, "+27821234567");
      });

      test("rejects valid numbers from disallowed countries", () => {
         const { error } = schema.validate("+12025550123");
         assert.isNotNull(error);
         assert.equal(error.details[0].message, '"value" must be a valid phone number');
      });

      test("still rejects local numbers if defaultCountry is omitted", () => {
         const { error } = schema.validate("0771234567");
         assert.isNotNull(error);
      });

      test("rejects non-geographic numbers when allowedCountries is specified", () => {
         const { error } = schema.validate("+80012345678");
         assert.isNotNull(error);
      });
   });

   suite("interaction between defaultCountry and allowedCountries", () => {
      test("automatically allows defaultCountry even if omitted from allowedCountries", () => {
         const schema = Joi.string().phone({ defaultCountry: "ZW", allowedCountries: ["ZA"] });

         const resZWLocal = schema.validate("0771234567");
         assert.isNull(resZWLocal.error || null);
         assert.equal(resZWLocal.value, "+263771234567");

         const resZWIntl = schema.validate("+263771234567");
         assert.isNull(resZWIntl.error || null);
         assert.equal(resZWIntl.value, "+263771234567");

         const resZA = schema.validate("+27821234567");
         assert.isNull(resZA.error || null);
         assert.equal(resZA.value, "+27821234567");

         const resUS = schema.validate("+12025550123");
         assert.isNotNull(resUS.error);
      });

      test("allows local numbers when defaultCountry is in allowedCountries", () => {
         const schema = Joi.string().phone({ defaultCountry: "ZW", allowedCountries: ["ZW", "ZA"] });

         const { error, value } = schema.validate("0771234567");
         assert.isNull(error || null);
         assert.equal(value, "+263771234567");
      });
   });
});

suite("Joi.check()", () => {
   test("returns { error: null, value } when validation succeeds with non-Joi schema", () => {
      const schema = {
         name: Joi.string().required(),
         phone: Joi.string().phone({ defaultCountry: "ZW" }).required(),
      };
      const data = {
         name: casual.first_name,
         phone: " 077 123 4567 ",
      };

      const result = Joi.check(data, schema);
      assert.isNull(result.error);
      assert.deepEqual(result.value, {
         name: data.name,
         phone: "+263771234567",
      });
   });

   test("returns { error, value } when validation fails with non-Joi schema", () => {
      const schema = {
         name: Joi.string().required(),
         phone: Joi.string().phone().required(),
      };
      const data = {
         name: casual.first_name,
         phone: "invalid",
      };

      const result = Joi.check(data, schema);
      assert.isString(result.error);
      assert.equal(result.error, '"phone" must be a valid phone number');
   });

   test("returns { error: null, value } with Joi schema", () => {
      const schema = Joi.object({
         age: Joi.number().required(),
      });
      const result = Joi.check({ age: "25" }, schema);
      assert.isNull(result.error);
      assert.strictEqual(result.value.age, 25);
   });

   test("returns error string with Joi schema on validation failure", () => {
      const schema = Joi.object({
         age: Joi.number().required(),
      });
      const result = Joi.check({ age: "not-a-number" }, schema);
      assert.isString(result.error);
   });
});


suite("Joi.check()", () => {
   test("returns { error: null, value } when validation succeeds with non-Joi schema", () => {
      const schema = {
         name: Joi.string().required(),
         phone: Joi.string().phone({ defaultCountry: "ZW" }).required(),
      };
      const data = {
         name: casual.first_name,
         phone: " 077 123 4567 ",
      };

      const result = Joi.check(data, schema);
      assert.isNull(result.error);
      assert.deepEqual(result.value, {
         name: data.name,
         phone: "+263771234567",
      });
   });

   test("returns { error, value } when validation fails with non-Joi schema", () => {
      const schema = {
         name: Joi.string().required(),
         phone: Joi.string().phone().required(),
      };
      const data = {
         name: casual.first_name,
         phone: "invalid",
      };

      const result = Joi.check(data, schema);
      assert.isString(result.error);
      assert.equal(result.error, '"phone" must be a valid phone number');
   });

   test("returns { error: null, value } with Joi schema", () => {
      const schema = Joi.object({
         age: Joi.number().required(),
      });
      const result = Joi.check({ age: "25" }, schema);
      assert.isNull(result.error);
      assert.strictEqual(result.value.age, 25);
   });

   test("returns error string with Joi schema on validation failure", () => {
      const schema = Joi.object({
         age: Joi.number().required(),
      });
      const result = Joi.check({ age: "not-a-number" }, schema);
      assert.isString(result.error);
   });
});