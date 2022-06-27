const logSetup = (req, res, next) => {
  req.info = {
    id: new Date().getTime(),
  };

  req.getInfo = () => `${req.info.id}, ${req?.user?._id || 'not-loggedin'}`;

  next();
};

export { logSetup };
