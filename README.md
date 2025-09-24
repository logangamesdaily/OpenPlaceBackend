# OpenPlaceBackend
The open source and freely available version of the Place site backend at https://beta.place.uk.to

# THIS IS NOT THE SAME SERVER USED ON THE SITE
It is simply a Place2-compatible server, and does not have email verification, or RISE account integration, instead it has it's own accounting system independent of anything else.  
In the future, when RISE OAuth is working, this server will be updated to optionally use it.

# How to use?
Firstly, you need a copy of a MySQL-compatible database server software installed and ready to go.  
Then, you need a way to import the db.sql file, which sets everything up for you DB-wise, I like to use PHPMyAdmin, simply because it's what I'm used to.
Then, you use this DB viewing software to create a database and name it whatever you like, then import the DB.sql file and execute it, or just copy the text contents and execute it inside of the database.  
Now you need to copy the .env.example file to a .env file, then configure that to your database details.
There, the server is set up and ready to go!

# How to access the server?
If your instance is public, you can use the normal client at [https://beta.place.uk.to](https://beta.place.uk.to/) (not place.uk.to, as Place v1 doesn't support server switching).  
However, if your instance is private or you want full control over the domain/access URL or just want it to be more convenient than switching over to your server every time, you can download the built place client and extract it to the html folder (with the readme in.) You can download the built client [here](https://beta.place.uk.to/placeclient.zip)
