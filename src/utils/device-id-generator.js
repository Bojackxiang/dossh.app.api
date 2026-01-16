export const deviceIdGenerator = () => {
  // Implementation of device ID generation
  const id = `device-${Math.random().toString(36).substr(2, 9)}`;
  return id;
};
