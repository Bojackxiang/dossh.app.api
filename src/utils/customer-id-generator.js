export const customerIdGenerator = () => {
  // Implementation of customer ID generation
  const id = `cust-${Math.random().toString(36).substr(2, 9)}`;
  return id;
};
