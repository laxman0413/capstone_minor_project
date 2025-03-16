from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa,padding
import base64
import sys

def encrypt_aes_key_with_rsa(aes_key_base64, public_key_pem_base64):
    aes_key = base64.b64decode(aes_key_base64)
    public_key_pem = base64.b64decode(public_key_pem_base64)

    public_key = serialization.load_pem_public_key(public_key_pem)

    encrypted_aes_key = public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    encrypted_aes_key_base64 = base64.b64encode(encrypted_aes_key).decode('utf-8')

    return encrypted_aes_key_base64

aes_key_base64 = base64.b64encode(sys.argv[1].encode('utf-8')).decode('utf-8')
public_key_pem_base64 = base64.b64encode(sys.argv[2].encode('utf-8')).decode('utf-8')

encrypted_aes_key_base64 = encrypt_aes_key_with_rsa(aes_key_base64, public_key_pem_base64)

print(encrypted_aes_key_base64)


