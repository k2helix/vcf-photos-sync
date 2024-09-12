const vCard = require('vcard-parser');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');

const defaultPhonePrefix = '34';
const MAX_SIZE = 120000;		// Android struggles to import big files so we need to limit it
const CONTACTS_PER_FILE = 50;	// Importing more than one file will add new contacts without removing existing ones

const client = new Client({
	authStrategy: new LocalAuth({
		dataPath: 'data_whatsapp'
	})
});

client.on('qr', (qr) => {
	qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
	console.log('WhatsApp client is ready');

	console.log('Parsing input file');
	const fileContent = fs.readFileSync('./contacts.vcf', { encoding: 'utf-8' });
	const lines = fileContent.split('\n');
	const contacts = [];

	let raw = '';
	let card;
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		raw += line + '\n';
		if (line.includes('END:')) {
			card = vCard.parse(raw);
			raw = '';
			contacts.push(card);

			// if (card.photo)
			// console.log(JSON.stringify(card.photo, null, 4))
		}
	}

	console.log('Input file parsed.')
	const wContacts = await client.getContacts();

  // fs.writeFileSync('./wContacts.json', JSON.stringify(wContacts, null, 4), {
  //   encoding: 'utf-8'
  // })

	const whatsappContacts = new Map();
	wContacts.forEach((contact) => {
		if (contact.id.user && contact.id._serialized) whatsappContacts.set(contact.id.user, contact.id._serialized);

		  // console.log(contact.id.user)
	});

	console.log('Getting WhatsApp contacts profile photos.')

	let phoneNumber;
	let newVCards = []
	contacts.forEach(async (contact) => {
		if (contact.tel) {
			phoneNumber = contact.tel[0]?.value.replace('+', '').replaceAll('-', '');
			// console.log(phoneNumber)

			if (!whatsappContacts.has(phoneNumber) && phoneNumber.slice(0, 2) === '55')
				if (phoneNumber.length === 12) whatsappContactId = whatsappContacts.get(phoneNumber.slice(0, 4) + '9' + phoneNumber.slice(4));
				else whatsappContactId = whatsappContacts.get(phoneNumber.slice(0, 4) + phoneNumber.slice(5));
			else whatsappContactId = whatsappContacts.get(phoneNumber);

      // Try to use phone prefix + phone number instead of just phone number
      if (!whatsappContactId) whatsappContactId = whatsappContacts.get(defaultPhonePrefix + phoneNumber);

			if (whatsappContactId) {
				photo = await downloadFile(client, whatsappContactId);

        // vCard version 2.1 requires base64 strings to end with two \n
        // the generate function only adds one so we're going to replace this
        // ñ later, as just using \n would literally write \n
        // https://android.googlesource.com/platform/frameworks/opt/vcard/+/5907243e6cf0603adf266ebfa7ee5ee465b9c596/java/com/android/vcard/VCardParserImpl_V21.java#842
				if (photo)
					if (photo.filesize < MAX_SIZE)
						contact.photo = [
							{
								value: photo.data +'ñ',
								meta: {
									encoding: ['BASE64'],
									jpeg: ['null']
								}
							}
						];
					else
						console.log(`Skipping ${contact.fn ? contact.fn[0].value : 'someone'}'s photo because it exceeded the maximum size with ${photo.filesize} bytes`)
        		else if (contact.photo && contact.photo[0]?.value)
          			contact.photo[0].value += 'ñ'

				// console.log('here')
			} // else console.log('not there')

			let generated = vCard.generate(contact);

			let lines = generated.split('\n');

      // Need to fix some wrongly parsed contacts
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				let couldBeWronglyParsed;

				if (line.length > 0 && line.startsWith(' ') && (!isNaN(line[1]) || line[1] == '=' || isUpperCase(line[1]))) couldBeWronglyParsed = true;
				else couldBeWronglyParsed = false;

				if (i > 0 && couldBeWronglyParsed && (lines[i - 1].startsWith('N') || lines[i - 1].startsWith('FN'))) {
					lines[i - 1] = lines[i - 1].replaceAll('\r', '') + line.slice(1);
					lines[i] = null;
					generated = lines.filter((l) => l != null).join('\n');
				}
			}

			newVCards.push(generated);
		}
	});

	console.log('Waiting for contact photos to be set')
  // I hate async
	setTimeout(() => {
		const numberOfContacts = newVCards.length;
		const numberOfFiles = Math.ceil(numberOfContacts / 50)
		
		console.log(`Saving ${numberOfContacts} contacts in ${numberOfFiles} files`);
		for (let i = 1; i <= numberOfFiles; i++) {
			const base = (i - 1) * CONTACTS_PER_FILE;
			const top =	i * CONTACTS_PER_FILE < numberOfContacts 
				? i * CONTACTS_PER_FILE 
				: numberOfContacts;

			const rawContent = newVCards.slice(base, top).join('\n');

			const parsedContent = rawContent
				.replaceAll('=:', ':')
				.replaceAll('=;', ';')
				.replaceAll('=null', '')
				.replaceAll('ñ', '\n');

			console.log(`Writing from ${base} to ${top} contacts to new_contacts_${i}.vcf`);
			fs.writeFileSync(`./new_contacts_${i}.vcf`, parsedContent, {
				encoding: 'utf-8'
			});
		}

		console.log('Done');
		process.exit();
	}, 5000);
});

client.initialize();

async function downloadFile(client, whatsappId) {
	const photoUrl = await client.getProfilePicUrl(whatsappId);
	if (!photoUrl) return null;

	const image = await MessageMedia.fromUrl(photoUrl);
	return image;
}

isUpperCase = (string) => /^[A-Z]*$/.test(string)