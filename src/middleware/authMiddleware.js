import jwt from "jsonwebtoken";

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // get token after "Bearer"

  if (!token){
    console.log("No token")
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
    }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token." });
    req.user = user; // store decoded user info
    next(); // continue to the next function (like post creation or liking)
  });
}

export function optionalAuthenticateToken(req, res, next) {
      console.log("Get auth")
	  const authHeader = req.headers["authorization"];
	    const token = authHeader && authHeader.split(" ")[1];

	      if (!token) {
	      	    req.user = null; // guest user
	      	        return next();
	      	          }

	      	            jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
	      	            	    if (err) {
	      	            	    	      req.user = null; // invalid token treated as guest
	      	            	    	            return next();
	      	            	    	                }
	      	            	    	                    req.user = user; // valid token
	      	            	    	                        next();
	      	            	    	                          });
	      	      }
