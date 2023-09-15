import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { users, User } from './user.js';

const app = express();
const port = 3001;

app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  console.log(name, email, password);

  // generating base32 secret
  let secret = speakeasy.generateSecret({ length: 20 });
  console.log(secret);

  const user = new User(users.length + 1, name, email, password, secret.base32);
  users.push(user);
  console.log(user);

  // creating token otp
  const token = speakeasy.totp({
    secret: user.secret,
    encoding: 'base32',
    step: 30, // OTP changes every 30 seconds
  });

  // creating qrcode
  QRCode.toDataURL(secret.otpauth_url, (err, image_data) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    } else {
      res.send({ token: token, qrCode: image_data });
    }
  });
});

app.post('/api/login', (req, res) => {
  const { email, password, token } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user || user.password !== password) {
    return res.status(401).send('Invalid credentials');
  }
  // verifying token otp
  const verified = speakeasy.totp.verify({
    secret: user.secret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (!verified) {
    return res.status(401).send('Invalid token');
  }
  res.send('Login successful');
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
