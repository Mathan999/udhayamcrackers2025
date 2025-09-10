import React from 'react';
import { Helmet } from 'react-helmet';
import { Phone, MessageCircle } from 'lucide-react';

const Contact = () => {
  const phoneNumber = "+919597413148";

  const openWhatsApp = () => {
    const message = "I want ask a question about crackers and orders!";
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.location.href = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    } else {
      window.open(`https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-8 px-4">
      <Helmet>
        {/* Basic meta tags */}
        <title>Contact UDHAYAM CRACKERS - Get in Touch</title>
        <meta name="description" content="Contact UDHAYAM CRACKERS easily via WhatsApp or phone. We're here to answer your questions and assist you with your cracker needs." />

        {/* OpenGraph meta tags for better social media sharing */}
        <meta property="og:title" content="Contact UDHAYAM CRACKERS - Get in Touch" />
        <meta property="og:description" content="Reach out to UDHAYAM CRACKERS via WhatsApp or phone. Quick and easy communication for all your cracker-related inquiries." />
        <meta property="og:image" content="/fav-icon.png" />
        <meta property="og:url" content="https://www.udhayamcrackers.com/contact" />
        <meta property="og:type" content="website" />

        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact UDHAYAM CRACKERS - Get in Touch" />
        <meta name="twitter:description" content="Connect with UDHAYAM CRACKERS instantly via WhatsApp or phone. We're here to help with all your cracker needs." />
        <meta name="twitter:image" content="/fav-icon.png" />

        {/* Additional SEO-friendly meta tags */}
        <meta name="keywords" content="contact, UDHAYAM CRACKERS, WhatsApp, phone, customer support, crackers, fireworks" />
        <meta name="author" content="UDHAYAM CRACKERS" />
        <meta name="robots" content="index, follow" />

        {/* Responsive design meta tag */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* Advanced: Schema.org markup for rich snippets */}
        <script type="application/ld+json">
          {`
            {
              "@context": "http://schema.org",
              "@type": "ContactPage",
              "name": "Contact UDHAYAM CRACKERS",
              "description": "Get in touch with AATHILAKSHMI CRACKERS for all your cracker needs",
              "url": "https://www.udhayamcrackers.com/contact",
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "${phoneNumber}",
                "contactType": "customer service"
              },
              "potentialAction": [
                {
                  "@type": "CommunicateAction",
                  "name": "WhatsApp",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://wa.me/${phoneNumber}?text=Hello%2C%20I%27d%20like%20to%20chat!"
                  }
                },
                {
                  "@type": "CommunicateAction",
                  "name": "Call",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "tel:${phoneNumber}"
                  }
                }
              ]
            }
          `}
        </script>
      </Helmet>

      <div className="max-w-3xl w-full bg-white shadow-lg rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Contact UDHAYAM CRACKERS</h1>
        
        <div className="flex flex-col md:flex-row justify-center gap-4 mb-8">
          <button
            onClick={openWhatsApp}
            className="flex items-center justify-center gap-2 bg-green-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-600 transition duration-300"
          >
            <MessageCircle size={24} />
            <span>WhatsApp</span>
          </button>
          <a
            href={`tel:${phoneNumber}`}
            className="flex items-center justify-center gap-2 bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-600 transition duration-300"
          >
            <Phone size={24} />
            <span>Phone</span>
          </a>
        </div>

        <div className="text-gray-700 text-base md:text-lg leading-relaxed">
          <p className="mb-4">
            As per the 2018 Supreme Court Order, Online Sale of Firecrackers are NOT permitted. We value our customers and at the same time, we respect the jurisdiction.
          </p>
          <p className="mb-4">
            We request our customers to select your products on the Estimate Page to see your estimation and submit the required crackers through the Get Estimate Button. We will contact you within 2 hours and confirm the order through a phone call.
          </p>
          <p className="mb-4">
            Please add and submit your enquiries and enjoy your Diwali with Udhayam Crackers. Udhayam Crackers is a shop following 100% legal & statutory compliances, and all our shops and go-downs are maintained as per the Explosives Acts.
          </p>
          <p className="mb-4">
            Our License Name: xxx <br />
            Licence No: x/xxxx
          </p>
          <p>
            We send the parcels through registered and legal transport service providers, as is standard practice among major companies in Sivakasi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contact;