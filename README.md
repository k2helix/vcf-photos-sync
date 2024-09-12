# VCF Photos Sync
This simple tool allows Android users that use WhatsApp to use WhatsApp profile pictures as contact pictures without the need of third parties such as Google Contacts.

It does so by using [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) and [vcard-parser](https://github.com/Heymdall/vcard), and therefore everything runs locally.

## Run locally

### Requirements
First you'll need to clone this repo to your local machine:
```sh
git clone https://github.com/k2helix/vcf-photos-sync.git
```

This is a Node.js project, so make sure you have it installed. 
If it's installed, make sure to get every dependency, which can be done with npm:
```sh
npm install
```

Then you only need to do this to run the tool (make sure you've included a file named `contacts.vcf` with your contacts in the same directory):
```sh
node parser.js
```
### Settings
If you look at the first lines of `parser.js`, there are three constants that you can change

- `defaultPhonePrefix` is the prefix that will be added to the phone number when looking for it on WhatsApp contacts only if it wasn't enough without the prefix
- `MAX_SIZE` is the maximum image file size in bytes that will be considered when a contact image is found. If an image exceeds this size, the image will be ignored and the contact will remain the same.
- `CONTACTS_PER_FILE` is the number of contacts to save per file. This is useful if you have many contacts as it's highly possible (it happened to me many times) that when importing the new contacts in a single file Android fails and only imports some due to the file being much bigger with the WhatsApp images. It shouldn't matter if you get many files as importing them should add new contacts but won't remove existing ones.

As you may have guessed, the last two constants can solve cases where files are too big. WhatsApp profile pictures are pretty big so having many contacts with photos in the same VCF file could (and will) cause issues.

However when you've run `parser.js` and every file with the contacts with photos is imported, if you try to export your contacts list you'll see the size of the (only) exported file has been reduced. I assume this is because Android compresses pictures upon they contacts get imported.
### How it works
You can see that the main file is `parser.js`. When running this file for the first time, you'll get a QR code for WhatsApp web which you've got to scan (it's generated by the aformentioned [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js), you can audit its source code if you feel like doing it). 

Once you've logged in, it'll look for a file in the same directory named `contacts.vcf`.
This `contacts.vcf` file can be obtained by exporting your Android contacts using the contacts app.

Next, it will parse every contact and search the WhatsApp contacts list to try to get its picture. It does so the same way as [whatsapp-contact-sync](https://github.com/guyzyl/whatsapp-contact-sync) so with some luck it'll find your contacts. It's been tested with Spanish phone numbers and it worked fine, although few phone numbers requred setting the constant `defaultPhonePrefix` to the Spanish phone prefix. You can change it if it doesn't work for you.

Note that if your contact already had a photo and the tool finds one in WhatsApp, it'll get replaced with the WhatsApp one. If the tool doesn't find your WhatsApp contact or they don't have a WhatsApp profile photo, it'll just leave it as is.

Once it finishes looking for photos, it'll just write them as specified by the `CONTACTS_PER_FILE` constant in new VCF files which you can import in your Contacts app.

If for some reason it fails, you always have your `contacts.vcf` file which you can just import to get you contact back.

