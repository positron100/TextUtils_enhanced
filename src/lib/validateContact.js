const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @returns {Partial<{name,email,message}>} field → message, empty when valid. */
export function validateContact({ name, email, message }) {
  const errors = {};

  if (!name.trim()) errors.name = "Please enter your name.";
  else if (name.trim().length < 2) errors.name = "Name must be at least 2 characters.";

  if (!email.trim()) errors.email = "Please enter your email.";
  else if (!EMAIL.test(email.trim())) errors.email = "Please enter a valid email address.";

  if (!message.trim()) errors.message = "Please enter a message.";
  else if (message.trim().length < 10) errors.message = "Message should be at least 10 characters.";

  return errors;
}
