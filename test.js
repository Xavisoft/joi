
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
})