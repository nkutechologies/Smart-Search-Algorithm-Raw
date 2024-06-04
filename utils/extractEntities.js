const { sequelize } = require('../models');
const commonWords = ['i','a', 'an', 'the', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'but', 'by', 'to', 'of', 'from', 'is', 'it'];

async function extractEntities(searchTerm) {
  // Split search term into words and lower case them for case-insensitive matching
  let searchWords = searchTerm.toLowerCase().split(' ')?.filter(x => !commonWords?.includes(x));
  searchWords = searchWords?.map(x => x?.replace(/\W/g, ''))?.filter(x => x !== '');
  // Create conditions for each search word
  const conditions = searchWords.map(word => `REPLACE(LOWER(name), "'", '') LIKE '%${word.toLowerCase()}%'`).join(' OR ');
  // Construct the raw SQL query
  const rawQuery = `
    SELECT id, name, 'City' as entity FROM Cities WHERE ${conditions}
    UNION ALL
    SELECT id, name, 'Brand' as entity FROM Brands WHERE ${conditions}
    UNION ALL
    SELECT id, name, 'DishType' as entity FROM DishTypes WHERE ${conditions}
    UNION ALL
    SELECT id, name, 'Diet' as entity FROM Diets WHERE ${conditions}
  `;

  // Execute the raw SQL query
  const entities = await sequelize.query(rawQuery, {
    type: sequelize.QueryTypes.SELECT,
    raw: true
  });

  // Separate entities by their types
  const cities = entities.filter(e => e.entity === 'City');
  const brands = entities.filter(e => e.entity === 'Brand');
  const dishTypes = entities.filter(e => e.entity === 'DishType');
  const diets = entities.filter(e => e.entity === 'Diet');

  // Function to find matches
  const findMatches = (items, terms) => {
    return items.filter(item => terms.some(term => item.name?.replace(/\W/g, '')?.toLowerCase()?.includes(term)));
  };

  // Filter matches for each entity type
  const cityMatches = findMatches(cities, searchWords);
  const brandMatches = findMatches(brands, searchWords);
  const dishTypeMatches = findMatches(dishTypes, searchWords);
  const dietMatches = findMatches(diets, searchWords);

  // Generate combinations based on the matches
  const results = [];

  const addCombination = (city, brand, dishType, diet) => {
    const combination = {};
    if (city) combination.city = { id: city.id, name: city.name };
    if (brand) combination.brand = { id: brand.id, name: brand.name };
    if (dishType) combination.dishType = { id: dishType.id, name: dishType.name };
    if (diet) combination.diet = { id: diet.id, name: diet.name };
    results.push(combination);
  };

  // Create combinations based on identified entities
  const createCombinations = (cities, brands, dishTypes, diets) => {
    if (!cities.length && !brands.length && !dishTypes.length && !diets.length) {
      results.push({});
      return;
    }

    const allCities = cities.length ? cities : [null];
    const allBrands = brands.length ? brands : [null];
    const allDishTypes = dishTypes.length ? dishTypes : [null];
    const allDiets = diets.length ? diets : [null];

    allCities.forEach(city => {
      allBrands.forEach(brand => {
        allDishTypes.forEach(dishType => {
          allDiets.forEach(diet => {
            addCombination(city, brand, dishType, diet);
          });
        });
      });
    });
  };

  createCombinations(cityMatches, brandMatches, dishTypeMatches, dietMatches);

  return results;
}

module.exports = extractEntities;
