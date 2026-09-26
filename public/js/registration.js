(function () {
  'use strict';

  const regionsByCountry = {
    India: [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ],
    'United Kingdom': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
    'United States': [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
    ]
  };

  const form = document.getElementById('patient-form');
  if (!form) return;

  const nameInput = document.getElementById('patient-name');
  const dobInput = document.getElementById('date-of-birth');
  const ageInput = document.getElementById('patient-age');
  const countryInput = document.getElementById('address-country');
  const regionInput = document.getElementById('address-region');
  const phoneInput = document.getElementById('patient-phone');

  phoneInput.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 15);
  });

  function setRegions(country, selectedValue = '') {
    const regions = regionsByCountry[country] || [];
    regionInput.replaceChildren(new Option('Choose a state or region', ''));
    regions.forEach((region) => regionInput.add(new Option(region, region)));
    if (regions.includes(selectedValue)) regionInput.value = selectedValue;
  }

  function ageOnDate(dateValue) {
    if (!dateValue) return '';
    const birthDate = new Date(`${dateValue}T00:00:00`);
    const today = new Date();
    if (Number.isNaN(birthDate.getTime()) || birthDate > today) return '';
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age -= 1;
    return age >= 0 && age <= 125 ? age : '';
  }

  dobInput.addEventListener('change', () => {
    ageInput.value = ageOnDate(dobInput.value);
  });
  countryInput.addEventListener('change', () => setRegions(countryInput.value));

  async function hydrate() {
    setRegions(countryInput.value);
    try {
      const data = await window.ReMind.fetchSession();
      const patient = data.patient || {};
      const contact = patient.contact || {};
      const address = patient.address || {};
      nameInput.value = patient.fullName || '';
      dobInput.value = patient.dateOfBirth || '';
      ageInput.value = patient.age ?? ageOnDate(dobInput.value);
      document.getElementById('patient-country-code').value = contact.countryCode || '+91';
      document.getElementById('patient-phone').value = contact.number || '';
      countryInput.value = address.country || 'India';
      setRegions(countryInput.value, address.region || '');
      document.getElementById('address-details').value = address.details || '';
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const patient = {
      fullName: nameInput.value.trim(),
      dateOfBirth: dobInput.value,
      age: Number(ageInput.value),
      contact: {
        countryCode: document.getElementById('patient-country-code').value,
        number: document.getElementById('patient-phone').value.replace(/\D/g, '')
      },
      address: {
        country: countryInput.value,
        region: regionInput.value,
        details: document.getElementById('address-details').value.trim()
      }
    };

    try {
      await window.ReMind.saveRegistration({ patient });
      window.ReMind.navigate('/caretaker.html');
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  });

  hydrate();
})();
