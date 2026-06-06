import axios from 'axios';

export const uploadToIPFS = async (file: File): Promise<string> => {
  if (!import.meta.env.VITE_PINATA_JWT) {
    throw new Error('Pinata JWT is not configured in .env');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
    headers: { Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}` }
  });

  return `ipfs://${res.data.IpfsHash}`;
};