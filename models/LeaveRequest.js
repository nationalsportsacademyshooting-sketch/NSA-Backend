const mongoose = require("mongoose");
const leaveSchema = new mongoose.Schema({
  shooter:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},
  fromDate:{type:String,required:true},
  toDate:{type:String,required:true},
  reason:{type:String,required:true,trim:true,maxlength:500},
  status:{type:String,enum:["pending","approved","rejected"],default:"pending",index:true},
  reviewedAt:{type:Date,default:null},
  reviewedBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null}
},{timestamps:true});
leaveSchema.index({shooter:1,fromDate:1,toDate:1});
module.exports=mongoose.model("LeaveRequest",leaveSchema);
