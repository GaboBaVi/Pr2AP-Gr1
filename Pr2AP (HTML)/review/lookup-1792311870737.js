(function(window, undefined) {
  var dictionary = {
    "cceaf974-7bd3-4656-bf22-3f59c1bd9915": "Member Reservation Screen",
    "f18de5ce-05d9-4d1d-b221-ca155b4b1a10": "Membership Screen",
    "836379e5-a686-4e46-bb61-a5b8f9a62999": "Login Screen",
    "05430f68-3629-4480-b67b-0ef7d6e07d5a": "Recovery Screen",
    "07850ed6-f9bc-462d-90d0-2cc2c4ac44c1": "Admin Notifs Log",
    "4fd423aa-87ef-49e2-8885-370e1e2255cf": "Admin Notification Screen",
    "bb416b6a-290c-4ce3-87dc-641cdb09d409": "Periodos Anteriores Screen",
    "3adc0a0a-9e99-4a97-bd74-45b0df68f2f7": "Register Screen",
    "70732a3a-e0d7-4603-9d66-47f290d0ca8e": "Admin Charges Screen",
    "124f67ee-e88d-4ef2-8ed7-2ec0181eb737": "Admin Members' Screen",
    "d2ef9c6e-ffaf-4416-a2c8-4de0472c8d1b": "Admin Facilities Screen",
    "9c92a31d-1665-493c-8daa-349efbdcf3fb": "Admin Screen",
    "8e2001fe-a132-4767-bddb-358ec694878c": "Member Screen",
    "8749e6fb-3837-4069-beb8-1856663b7c31": "Member Profile Screen",
    "c325d59d-c594-4887-a9c6-af268c1bf965": "Member Reservation Form Screen",
    "d12245cc-1680-458d-89dd-4f0d7fb22724": "Main Menu",
    "f39803f7-df02-4169-93eb-7547fb8c961a": "Template 1",
    "bb8abf58-f55e-472d-af05-a7d1bb0cc014": "Board 1"
  };

  var uriRE = /^(\/#)?(screens|templates|masters|scenarios)\/(.*)(\.html)?/;
  window.lookUpURL = function(fragment) {
    var matches = uriRE.exec(fragment || "") || [],
        folder = matches[2] || "",
        canvas = matches[3] || "",
        name, url;
    if(dictionary.hasOwnProperty(canvas)) { /* search by name */
      url = folder + "/" + canvas;
    }
    return url;
  };

  window.lookUpName = function(fragment) {
    var matches = uriRE.exec(fragment || "") || [],
        folder = matches[2] || "",
        canvas = matches[3] || "",
        name, canvasName;
    if(dictionary.hasOwnProperty(canvas)) { /* search by name */
      canvasName = dictionary[canvas];
    }
    return canvasName;
  };
})(window);