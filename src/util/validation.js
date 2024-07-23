export const validateRegionCode = (region_code) => {
  if (!region_code || region_code.length <= 2) {
    return "Region code must be at least 3 characters long.";
  }
  return "";
};

export const validateMunicipalityCode = (municipality_code) => {
  if (!municipality_code || municipality_code.length <= 4) {
    return "Municipality code must be at least 5 characters long.";
  }
  return "";
};

export const validateName = (name) => {
  if (!name || name.length <= 2) {
    return "Name must be at least 3 character long.";
  }
  return "";
};

export const validateNameEn = (name_en) => {
  if (!name_en || name_en.length <= 2) {
    return "Name (EN) must be at least 3 character long.";
  }
  return "";
};

export const validateMunicipalityEntity = (entity) => {
  const errors = [];
  if (!entity.municipality_code || entity.municipality_code.length <= 4) {
    errors.push("Municipality code must be at least 5 characters long.");
  }
  if (!entity.name || entity.name.length <= 2) {
    errors.push("Name must be at least 3 character long.");
  }
  if (!entity.name_en || entity.name_en.length <= 2) {
    errors.push("Name (EN) must be at least 3 character long.");
  }
  if (!entity.region_id) {
    errors.push("Region ID is required.");
  }
  return errors;
};

export const validateRegionEntity = (entity) => {
  const errors = [];
  if (!entity.region_code || entity.region_code.length <= 2) {
    errors.push("Region code must be at least 3 characters long.");
  }
  if (!entity.name || entity.name.length <= 2) {
    errors.push("Name must be at least 3 character long.");
  }
  if (!entity.name_en || entity.name_en.length <= 2) {
    errors.push("Name (EN) must be at least 3 character long.");
  }
  return errors;
};
