export const isObject = (variable) =>
  typeof variable === 'object' && !Array.isArray(variable) && variable !== null;

const restore = (result, possiblePopulatedFields) => ({
  ...result,
  ...possiblePopulatedFields.reduce(
    (acc, cur) => ({
      ...acc,
      ...(isObject(result[`${cur}Id`]) && {
        [`${cur}Id`]: result[`${cur}Id`]._id,
        [cur]: result[`${cur}Id`],
      }),
    }),
    {}
  ),
});

// if the query needs e.g. user, we populate userId and then use the restore method
// to swap the values of those 2 fields so that user has the user and userId has the userId
// possiblePopulatedFields is an array of fields that can be populated, but only the query asked for them
const populate = async (query, info, possiblePopulatedFields) => {
  const fieldsToPopulate: string[] = [];

  // check if we should populate the user attribute
  possiblePopulatedFields.forEach((possiblePopulatedField) => {
    const shouldPopulateField = info.fieldNodes[0].selectionSet.selections.some(
      (field) => field.name.value === possiblePopulatedField
    );

    if (shouldPopulateField) {
      fieldsToPopulate.push(possiblePopulatedField);
    }
  });

  let results;

  try {
    results = await query
      .populate(fieldsToPopulate.map((field) => `${field}Id`))
      .lean();
  } catch {
    // this is used for .create() that has no populate method
    results = await query;
    results = await results.populate(
      fieldsToPopulate.map((field) => `${field}Id`)
    );
    results = results.toObject();
  }

  // populate the possiblePopulatedFields attribute and restore the "originalId"
  if (results) {
    if (Array.isArray(results)) {
      if (results.length > 0) {
        results = results.map((result) =>
          restore(result, possiblePopulatedFields)
        );
      }
    } else {
      results = restore(results, possiblePopulatedFields);
    }
  }

  return results;
};

export default populate;
