var entities = require('../models/modelentities');
var Account = require('../models/account');
var async = require('async');

var PasswordResetRequest = entities.PasswordResetRequest;
var emailerUtility = require('../utils/emailer.js');

var PASSWORD_RESET_SUBJECT = "Smart Citizen Password Reset";
var PASSWORD_RESET_BODY = "You have requested to reset your password for Smart Citizen Platform. To do that, please click on the Password Reset link. \n";
    PASSWORD_RESET_BODY += "Alternatively, you can copy the link to your Browser's address bar \n\n";

exports.createNew = function(email, callback){
   //async waterfall is a nice way to avoid heavy nesting...
   async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    }, function(err, resetRequestToken, done){
	   //set the passwordResetRequestToken on the user
	   if(resetRequestToken){
	     //locate the user by email
		 Account.findOne({'email': email }, function(err, user){
		    if(!user){ done(new Error("No User Exist with that email address.")); }
			else{
				//we've got our user - set the user reset-token
				user.passwordResetRequestToken = resetRequestToken;
				user.tokenExpiry = Date.now() + 3600000; // just one hour time to live
				user.save(function(err){
				  //now pass on to the emailing function
				  done(err, user,resetRequestToken); 
				});
			}
		 });
	   }
	   else{
	     done(new Error("Token Not Generated - cannot process password reset request"));
	   }
	},
	function(err, user, token, done){
	
	   if(!err){
		  //generate the reset URL (need to get the server URL automatically)
		  var resetURL = "<a href='http://localhost:3000/reset/'"+token+"'>"+ "Password Reset Link: http://localhost:3000/reset/"+token+" </a>";			  
		  PASSWORD_RESET_BODY += resetURL;
		  emailerUtility.sendMail(user.email,PASSWORD_RESET_SUBJECT,PASSWORD_RESET_BODY, function (emailError, sent){
			if(emailError){
			//there was a problem with emailing - indicate this to the user
			  done (new Error("There was a problem sending you a Password Reset Instructions via email. Error is "+emailError));
			}
			else{
			  done(null, sent);				
			}
		  }); 
		}
	}
	], function (err){
	  //end of the water fall..
	  if(!err){ callback(null, true); }
	  else{ callback(err, false);}	  
	});



  //find the email address
  /*
  Account.findOne(email, function(err, user){
	if(!user){callback (new Error("Email Address Not Found. Not Account With That Email Exists With Email Address : "+email)); return; }
		//at this point we can now create a new request
		var newPasswordRequest = new PasswordResetRequest({username:user.username});
		newPasswordRequest.save(function(err){
			if(!err){
			  //generate the reset URL (need to get the server URL automatically)
			  var resetURL = "<a href='http://localhost:3000/reset/'"+newPasswordRequest._id+"'>"+ "Password Reset Link: http://localhost:3000/reset/"+newPasswordRequest._id+" </a>";			  
			  PASSWORD_RESET_BODY += resetURL;
			  emailerUtility.sendMail(email,PASSWORD_RESET_SUBJECT,PASSWORD_RESET_BODY, function (emailError, sent){
				if(emailError){
				//there was a problem with emailing - indicate this to the user
				  callback (new Error("There was a problem sending you a Password Reset Instructions via email. Error is "+emailError));
				}
				else{
				  callback(null, sent);				
				}
			  }); 
			}
		});
  });  */

};

//locate a password reset
exports.getById = function (id, callback){
  PasswordResetRequest.findById(id, function (err, resetRequest){
	console.log ("Got PasswordResetRequest by ID = ",resetRequest);
    callback(err, resetRequest);
  });
};