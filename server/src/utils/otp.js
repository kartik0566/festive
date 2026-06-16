import bcrypt from "bcryptjs";

export const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export const hashOtp = async (otp) => bcrypt.hash(otp, 10);

export const verifyOtp = async (otp, hash) => {
  if (!otp || !hash) {
    return false;
  }

  return bcrypt.compare(String(otp), hash);
};

export const otpExpiry = (minutes = 10) => new Date(Date.now() + minutes * 60 * 1000);

export const isExpired = (date) => !date || new Date(date).getTime() < Date.now();

