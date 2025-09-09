import  { useState, useEffect } from "react";
import { ref as dbRef, onValue, remove, update } from "firebase/database";
import { database } from "../../firebase";
import { X, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";

function Products1() {
  const [filter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newImage, setNewImage] = useState(null);

  // Cloudinary configuration
  const CLOUDINARY_UPLOAD_PRESET = "mahithra"; // Replace with your Cloudinary unsigned upload preset
  const CLOUDINARY_CLOUD_NAME = "dirbsbdfh"; // Replace with your Cloudinary cloud name
  const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  useEffect(() => {
    const productsRef = dbRef(database, 'products');
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedProducts = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value,
          climate: value.climate || 'Unspecified',
          imageUrl: value.imageUrl || 'https://res.cloudinary.com/dirbsbdfh/image/upload/v1736330400/default-product-image_mqjqzs.png'
        }));
        setProducts(loadedProducts);
      } else {
        setProducts([]);
      }
    }, (error) => {
      console.error("Error fetching products:", error);
      setError("Failed to fetch products. Please try again.");
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(product =>
    (filter === 'all' || 
     (product.climate && product.climate.toLowerCase() === filter.toLowerCase())) &&
    (product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const updateCart = (product, quantity) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.id === product.id);
      if (existingItemIndex !== -1) {
        const updatedCart = [...prevCart];
        if (quantity > 0) {
          updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], quantity };
        } else {
          updatedCart.splice(existingItemIndex, 1);
        }
        return updatedCart;
      } else if (quantity > 0) {
        return [...prevCart, { ...product, quantity }];
      }
      return prevCart;
    });
  };

  const handleEdit = (product) => {
    setEditingProduct({ ...product });
    setNewImage(null);
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setNewImage(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    setError(null);
    let updatedProduct = { ...editingProduct };

    if (newImage) {
      try {
        const formData = new FormData();
        formData.append("file", newImage);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        const response = await axios.post(CLOUDINARY_UPLOAD_URL, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });

        if (response.data.secure_url) {
          updatedProduct.imageUrl = response.data.secure_url;
        } else {
          throw new Error("Failed to upload image to Cloudinary");
        }
      } catch (error) {
        console.error("Error uploading image to Cloudinary:", error);
        setError("Failed to upload image. Please try again.");
        return;
      }
    }

    try {
      const productRef = dbRef(database, `products/${editingProduct.id}`);
      await update(productRef, {
        productName: updatedProduct.productName,
        code: updatedProduct.code,
        category: updatedProduct.category,
        climate: updatedProduct.climate,
        mrp: updatedProduct.mrp,
        discount: updatedProduct.discount,
        ourPrice: updatedProduct.ourPrice,
        imageUrl: updatedProduct.imageUrl
      });

      setProducts(prevProducts => 
        prevProducts.map(p => p.id === updatedProduct.id ? updatedProduct : p)
      );
      setEditingProduct(null);
      setNewImage(null);
    } catch (error) {
      console.error("Error updating product:", error);
      setError("Failed to update product. Please try again.");
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const productRef = dbRef(database, `products/${productId}`);
        await remove(productRef);
        setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
      } catch (error) {
        console.error("Error deleting product:", error);
        setError("Failed to delete product. Please try again.");
      }
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <Link to='/admin' className="text-2xl bg-gray-400 px-2 py-3 rounded-2xl" style={{ marginBottom: '30px'}}> ⬅ Back</Link>
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 mb-6 border-2xl border-[#000!important] rounded text-black mt-10"
        />
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-4 py-2">Preview</th>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Per</th>
                <th className="px-4 py-2">Climate</th>
                <th className="px-4 py-2">M.R.P</th>
                <th className="px-4 py-2">Discount</th>
                <th className="px-4 py-2">Our Price</th>
                <th className="px-4 py-2">Qty</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id} className="border-b">
                  <td className="px-4 py-2">
                    {editingProduct?.id === product.id ? (
                      <div className="flex flex-col items-center">
                        <img 
                          src={newImage ? URL.createObjectURL(newImage) : product.imageUrl} 
                          alt={product.productName || 'Product'} 
                          className="w-20 h-20 object-cover mb-2"
                          onError={(e) => {
                            e.target.src = 'https://res.cloudinary.com/dirbsbdfh/image/upload/v1736330400/default-product-image_mqjqzs.png';
                          }}
                        />
                        <input 
                          type="file" 
                          onChange={handleImageChange} 
                          accept="image/*" 
                          className="text-sm" 
                        />
                      </div>
                    ) : (
                      <img 
                        src={product.imageUrl} 
                        alt={product.productName || 'Product'} 
                        className="w-20 h-20 object-cover cursor-pointer" 
                        onClick={() => setSelectedImage(product.imageUrl)}
                        onError={(e) => {
                          e.target.src = 'https://res.cloudinary.com/dirbsbdfh/image/upload/v1736330400/default-product-image_mqjqzs.png';
                        }}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingProduct?.id === product.id ? (
                      <input 
                        value={editingProduct.code || ''} 
                        onChange={(e) => setEditingProduct({...editingProduct, code: e.target.value})} 
                        className="w-full p-1 border rounded" 
                      />
                    ) : (
                      product.code || '-'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingProduct?.id === product.id ? (
                      <input 
                        value={editingProduct.productName || ''} 
                        onChange={(e) => setEditingProduct({...editingProduct, productName: e.target.value})} 
                        className="w-full p-1 border rounded" 
                      />
                    ) : (
                      product.productName || '-'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingProduct?.id === product.id ? (
                      <input 
                        value={editingProduct.category || ''} 
                        onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} 
                        className="w-full p-1 border rounded" 
                      />
                    ) : (
                      product.category || '-'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingProduct?.id === product.id ? (
                      <input 
                        value={editingProduct.climate || ''} 
                        onChange={(e) => setEditingProduct({...editingProduct, climate: e.target.value})} 
                        className="w-full p-1 border rounded" 
                      />
                    ) : (
                      product.climate || 'Unspecified'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingProduct?.id === product.id ? (
                      <input 
                        type="number" 
                        value={editingProduct.mrp || ''} 
                        onChange={(e) => setEditingProduct({...editingProduct, mrp: e.target.value})} 
                        className="w-full p-1 border rounded" 
                      />
                    ) : (
                      <s>₹{Number(product.mrp || 0).toFixed(2)}</s>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingProduct?.id === product.id ? (
                      <input 
                        type="number" 
                        value={editingProduct.discount || ''} 
                        onChange={(e) => setEditingProduct({...editingProduct, discount: e.target.value})} 
                        className="w-full p-1 border rounded" 
                      />
                    ) : (
                      `${product.discount || 0}%`
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingProduct?.id === product.id ? (
                      <input 
                        type="number" 
                        value={editingProduct.ourPrice || ''} 
                        onChange={(e) => setEditingProduct({...editingProduct, ourPrice: e.target.value})} 
                        className="w-full p-1 border rounded" 
                      />
                    ) : (
                      `₹${Number(product.ourPrice || 0).toFixed(2)}`
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      min="0" 
                      onChange={(e) => updateCart(product, parseInt(e.target.value) || 0)} 
                      value={cart.find(item => item.id === product.id)?.quantity || ''}
                      className="w-16 p-1 border rounded"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-2">
                    ₹{(Number(product.ourPrice || 0) * (cart.find(item => item.id === product.id)?.quantity || 0)).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    {editingProduct?.id === product.id ? (
                      <button 
                        onClick={handleSave} 
                        className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        <X size={18} />
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(product)} 
                          className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)} 
                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" 
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative">
              <img 
                src={selectedImage} 
                alt="Full size product" 
                className="max-w-full max-h-full" 
                onError={(e) => {
                  e.target.src = 'https://res.cloudinary.com/dirbsbdfh/image/upload/v1736330400/default-product-image_mqjqzs.png';
                }}
              />
              <button 
                className="absolute top-2 right-2 bg-white rounded-full p-1" 
                onClick={() => setSelectedImage(null)}
              >
                <X size={24} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Products1;