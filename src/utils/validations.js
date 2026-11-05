const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s-]{7,15}$/;
const DIGITS_PATTERN = /^[0-9]+$/;
const FULL_NAME_PATTERN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
const PLATE_PATTERN = /^[A-Z]{3}[0-9]{3}$/;

const hasValue = (value) =>
  typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;

const parseISODate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const isValidDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

  return isValidDate ? date : null;
};

const getAge = (date) => {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDifference = today.getMonth() - date.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }

  return age;
};

export const validateRegister = (values) => {
  const errors = {};

  if (!hasValue(values.email)) {
    errors.email = 'Ingresa tu correo electrónico';
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Ingresa un correo electrónico válido';
  }

  if (!hasValue(values.phone)) {
    errors.phone = 'Ingresa tu número de teléfono';
  } else if (!PHONE_PATTERN.test(values.phone.trim())) {
    errors.phone = 'Ingresa un teléfono válido';
  }

  if (!hasValue(values.password)) {
    errors.password = 'Crea una contraseña';
  } else if (values.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres';
  }

  if (!hasValue(values.confirmPassword)) {
    errors.confirmPassword = 'Confirma tu contraseña';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }

  if (!values.acceptTerms) {
    errors.acceptTerms = 'Debes aceptar los términos y condiciones';
  }

  return errors;
};

export const validatePersonalData = (values) => {
  const errors = {};
  const fullName = values.fullName?.trim() ?? '';
  const documentNumber = values.documentNumber?.trim() ?? '';
  const phone = values.phone?.trim() ?? '';
  const email = values.email?.trim() ?? '';

  if (!fullName) {
    errors.fullName = 'Ingresa tu nombre completo';
  } else if (fullName.length > 50) {
    errors.fullName = 'El nombre no puede superar los 50 caracteres';
  } else if (!FULL_NAME_PATTERN.test(fullName)) {
    errors.fullName = 'El nombre solo puede contener letras y espacios';
  }

  if (!documentNumber) {
    errors.documentNumber = 'Ingresa tu documento de identidad';
  } else if (!DIGITS_PATTERN.test(documentNumber) || documentNumber.length < 6 || documentNumber.length > 10) {
    errors.documentNumber = 'El documento debe tener entre 6 y 10 dígitos';
  }

  if (!phone) {
    errors.phone = 'Ingresa tu número de celular';
  } else if (!DIGITS_PATTERN.test(phone) || phone.length !== 10) {
    errors.phone = 'El celular debe tener exactamente 10 dígitos';
  }

  if (!values.birthDate) {
    errors.birthDate = 'Selecciona tu fecha de nacimiento';
  } else {
    const birthDate = parseISODate(values.birthDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!birthDate) {
      errors.birthDate = 'Selecciona una fecha válida';
    } else if (birthDate > today) {
      errors.birthDate = 'La fecha de nacimiento no puede ser futura';
    } else if (getAge(birthDate) < 18) {
      errors.birthDate = 'Debes ser mayor de 18 años';
    }
  }

  if (!hasValue(values.gender)) {
    errors.gender = 'Selecciona tu género';
  }

  if (!email) {
    errors.email = 'Ingresa tu correo electrónico';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Ingresa un correo electrónico válido';
  }

  if (!hasValue(values.language)) {
    errors.language = 'Selecciona tu idioma';
  }

  if (!values.profilePhoto) {
    errors.profilePhoto = 'La foto de perfil es obligatoria';
  }

  return errors;
};

export const validateVehicle = (values) => {
  const errors = {};
  const currentYear = new Date().getFullYear();
  const plate = values.plate?.trim().toUpperCase() ?? '';
  const brand = values.brand?.trim() ?? '';
  const model = values.model?.trim() ?? '';
  const year = values.year?.trim() ?? '';
  const passengerCapacity = values.passengerCapacity?.trim() ?? '';

  if (!hasValue(values.category)) {
    errors.category = 'Selecciona una categoría';
  }

  if (!plate) {
    errors.plate = 'Ingresa la placa del vehículo';
  } else if (!PLATE_PATTERN.test(plate)) {
    errors.plate = 'La placa debe tener el formato ABC123';
  }

  if (!brand) {
    errors.brand = 'Ingresa la marca del vehículo';
  } else if (brand.length > 30) {
    errors.brand = 'La marca no puede superar los 30 caracteres';
  }

  if (!model) {
    errors.model = 'Ingresa el modelo del vehículo';
  } else if (model.length > 30) {
    errors.model = 'El modelo no puede superar los 30 caracteres';
  }

  if (!year) {
    errors.year = 'Ingresa el año del vehículo';
  } else if (!/^\d{4}$/.test(year)) {
    errors.year = 'El año debe tener 4 dígitos';
  } else if (Number(year) > currentYear) {
    errors.year = 'El año no puede superar el año actual';
  }

  if (!hasValue(values.color)) {
    errors.color = 'Selecciona el color del vehículo';
  }

  if (!passengerCapacity) {
    errors.passengerCapacity = 'Ingresa la capacidad de pasajeros';
  } else if (!DIGITS_PATTERN.test(passengerCapacity) || Number(passengerCapacity) < 1) {
    errors.passengerCapacity = 'La capacidad debe ser un número mayor a 0';
  } else if (values.category === 'xl' && Number(passengerCapacity) < 6) {
    errors.passengerCapacity = 'La categoría XL requiere mínimo 6 pasajeros';
  }

  if (!values.vehiclePhoto) {
    errors.vehiclePhoto = 'La foto del vehículo es obligatoria';
  }

  return errors;
};
