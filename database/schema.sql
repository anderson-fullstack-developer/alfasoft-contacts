CREATE TABLE contacts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact CHAR(9) NOT NULL,
  email VARCHAR(255) NOT NULL,
  picture VARCHAR(255) NOT NULL,
  UNIQUE KEY uq_contacts_contact (contact),
  UNIQUE KEY uq_contacts_email (email)
);
