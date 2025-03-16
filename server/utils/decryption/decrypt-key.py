from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
import base64
import sys

def decrypt_aes_key_with_rsa(encrypted_aes_key_base64, private_key_pem_base64):
    encrypted_aes_key = base64.b64decode(encrypted_aes_key_base64)
    private_key_pem = base64.b64decode(private_key_pem_base64)
    
    private_key = serialization.load_pem_private_key(private_key_pem, password=None)

    decrypted_aes_key = private_key.decrypt(
        encrypted_aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
        
    return decrypted_aes_key.decode("utf-8")


encrypted_aes_key_base64 = sys.argv[1]
private_key_pem_base64 = base64.b64encode(sys.argv[2].encode('utf-8')).decode('utf-8')

decrypted_aes_key_base64 = decrypt_aes_key_with_rsa(encrypted_aes_key_base64, private_key_pem_base64)

print(decrypted_aes_key_base64)
