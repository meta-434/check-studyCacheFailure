// // Mock async DB query
// function queryErrorsFromDatabase() {
//   return Promise.resolve([
//     {
//       medical_study_id: "1",
//       message: "failure message",
//       corporate_entity_id: "999",
//       username: "alexhapgood",
//       date: "2025-05-29T19:43:06.000Z",
//     },
//   ]);
// }

// // Mock async notifier
// function notifyAdmin(newErrors) {
//   return new Promise((resolve) => {
//     console.log("Sending alert for:");
//     console.log(JSON.stringify(newErrors, null, 2));
//     resolve();
//   });
// }

// // actual real mssql and nodemailer test stubs possible, too...

// todo: write mock async db response for 2 errors, including response from return 1 error function
//
// test matrix
// db= [1], cr= [] => alert 1; => cr = [hash(1)];
// db= [1], cr= [hash(1)] => null; => cr = [hash(1)];
// db= [1, 2], cr= [hash(1)] => alert 2; => cr = [hash(1), hash(2)];
//
//
// pruning functions for db & cr file?
