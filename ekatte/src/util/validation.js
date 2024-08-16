export const validateRegionCode = (region_code) => {
  const regionCodeRegex = /^[a-zA-Z]{3,}$/;
  if (!region_code || !regionCodeRegex.test(region_code)) {
    return "Region code must be at least 3 characters long and contain only Latin letters and digits.";
  }
};

export const validateMunicipalityCode = (municipality_code) => {
  const municipalityCodeRegex = /^[a-zA-Z0-9]{5,}$/;
  if (!municipality_code || !municipalityCodeRegex.test(municipality_code)) {
    return "Municipality code must be at least 5 characters long and contain only Latin letters and digits.";
  }
};

export const validateTownHallCode = (town_hall_code) => {
  const townHallCodeRegex = /^[A-Z]{3,}[0-9]{2,}-\d{2,}$/;
  if (!town_hall_code || !townHallCodeRegex.test(town_hall_code)) {
    return "Town hall code must contain be at least 8 characters long and contain only Latin letters and digits. (ABC99-99)";
  }
};

export const validateEkatte = (ekatte) => {
  const ekatteRegex = /^[0-9]{5,}$/;
  if (!ekatte || !ekatteRegex.test(ekatte)) {
    return "Ekatte code must be at least 5 characters long and contain only Latin letters and digits.";
  }
};

export const validateName = (name) => {
  const cyrillicRegex = /^[а-яА-Я]{3,}$/;
  if (!name || !cyrillicRegex.test(name)) {
    return "Name must be at least 3 characters long and contain only Cyrillic letters.";
  }
};

export const validateNameEn = (name_en) => {
  const latinRegex = /^[a-zA-Z]{3,}$/;
  if (!name_en || !latinRegex.test(name_en)) {
    return "Name (EN) must be at least 3 characters long and contain only Latin letters.";
  }
};

export const validateReferenceId = (name, id) => {
  if(! id) {
    return `${name} is required.`
  }
}

export const validateMunicipalityEntity = (entity) => {
  const errors = [];
  let error;

  error = validateMunicipalityCode(entity.municipality_code);
  if (error) errors.push(error);

  error = validateName(entity.name);
  if (error) errors.push(error);

  error = validateNameEn(entity.name_en);
  if (error) errors.push(error);

  if (!entity.region_id) {
    errors.push("Region is required.");
  }

  return errors;
};

export const validateRegionEntity = (entity) => {
  const errors = [];
  let error;

  error = validateRegionCode(entity.region_code);
  if (error) errors.push(error);

  error = validateName(entity.name);
  if (error) errors.push(error);

  error = validateNameEn(entity.name_en);
  if (error) errors.push(error);

  return errors;
};

export const validateSettlementEntity = (entity) => {
  const errors = [];
  let error;

  error = validateEkatte(entity.ekatte);
  if (error) errors.push(error);

  error = validateName(entity.name);
  if (error) errors.push(error);

  error = validateNameEn(entity.name_en);
  if (error) errors.push(error);

  if (!entity.town_hall_id) {
    errors.push("Town hall is required.");
  }

  return errors;
};

export const validateTownHallEntity = (entity) => {
  const errors = [];
  let error;

  error = validateTownHallCode(entity.town_hall_code);
  if (error) errors.push(error);

  error = validateName(entity.name);
  if (error) errors.push(error);

  error = validateNameEn(entity.name_en);
  if (error) errors.push(error);

  if (!entity.municipality_id) {
    errors.push("Municipality is required.");
  }

  return errors;
};