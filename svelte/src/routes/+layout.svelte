
<script lang="ts">
import './layout.css';

const { children } = $props();
</script>
<header>
	<center><big>
This is not a test... 
It is a header of a test
</big></center>
<a href=http://localhost:5173/demo/better-auth/login>Login</a>
<a href=http://localhost:5173>Home</a>
<a href=http://localhost:5173/about>About</a>
</header>

<footer><center>

The hobbits. In isengard

</center></footer>
{@render children()}
