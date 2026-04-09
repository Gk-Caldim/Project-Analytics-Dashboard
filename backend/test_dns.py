import socket
import sys

host = "aws-1-ap-south-1.pooler.supabase.com"
print(f"Trying to resolve: {host}")
try:
    addr = socket.gethostbyname(host)
    print(f"Address: {addr}")
except Exception as e:
    print(f"Error resolving {host}: {e}")

host2 = "aws-0-ap-south-1.pooler.supabase.com"
print(f"Trying to resolve: {host2}")
try:
    addr2 = socket.gethostbyname(host2)
    print(f"Address: {addr2}")
except Exception as e:
    print(f"Error resolving {host2}: {e}")
